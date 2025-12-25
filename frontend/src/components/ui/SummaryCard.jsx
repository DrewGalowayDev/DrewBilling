import clsx from "clsx"; // Import clsx for class merging
import Card, { CardContent, CardHeader, CardTitle } from "../ui/Card";

const SummaryCard = ({ title, value, icon: Icon, className }) => {
  return (
    <Card className={clsx("p-3 md:p-4 shadow-md rounded-xl", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs md:text-sm font-medium line-clamp-2">{title}</CardTitle>
        {Icon && <Icon className="w-4 h-4 md:w-6 md:h-6 text-gray-500 flex-shrink-0" />}
      </CardHeader>
      <CardContent>
        <p className="text-lg md:text-2xl font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
