// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface iBEP20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function allowance(address, address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function burn(uint) external;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface iBEP677 {
 function onTokenApproval(address token, uint amount, address member,bytes calldata data) external;
 function onTokenTransfer(address token, uint amount, address member,bytes calldata data) external;
}

interface iDAO {
    function ROUTER() external view returns (address);
    function BASE() external view returns (address);
    function UTILS() external view returns (address);
    function DAO() external view returns (address);
    function RESERVE() external view returns (address);
    function BOND() external view returns (address);
    function SYNTHFACTORY() external view returns (address);
    function POOLFACTORY() external view returns (address);
    function depositForMember(address pool, uint256 amount, address member) external;
    function bondingPeriodSeconds() external returns (uint256);
}

interface iDAOVAULT{
function getMemberWeight(address) external view returns (uint256);
function depositLP(address, uint, address) external;
function withdraw(address, address) external returns (bool);
function totalWeight() external view returns (uint);
}

interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external;
    function removeCuratedPool(address) external;
    function isPool(address) external returns (bool);
    function getPool(address) external view returns (address);
    function createPool(address) external view returns (address);
    function getPoolArray(uint) external view returns (address);
    function poolCount() external view returns (uint);
    function getToken(uint) external view returns (address);
    function tokenCount() external view returns (uint);
    function getCuratedPoolsLength() external view returns (uint);
}

interface iROUTER {
    function addLiquidityForMember(uint, uint, address, address) external payable returns (uint);
    function grantFunds(uint, address) external payable returns (bool);
    function changeArrayFeeSize(uint) external;
    function changeMaxTrades(uint) external;
    function addLiquidity(uint, uint, address) external payable returns (uint);
    function totalPooled() external view returns (uint);
    function totalVolume() external view returns (uint);
    function totalFees() external view returns (uint);
    function getPool(address) external view returns (address payable);
}

interface iSYNTH {
    function genesis() external view returns (uint);
    function totalMinted() external view returns (uint);
    function LayerONE()external view returns (address);
    function mintSynth(address, uint) external returns (uint256);
    function burnSynth() external returns (uint);
    function realise(address pool) external;
}

interface iSYNTHFACTORY {
    function isSynth(address) external view returns (bool);
    function getSynth(address) external view returns (address);
}

interface iUTILS {
    function calcShare(uint, uint, uint) external pure returns (uint);
    function getFeeOnTransfer(uint256, uint256) external view returns (uint);
    function getPoolShareWeight(address, uint)external view returns (uint);
    function calcAsymmetricValueBase(address, uint) external pure returns (uint);
    function calcAsymmetricValueToken(address, uint) external pure returns (uint);
    function calcLiquidityUnits(uint, uint, uint, uint, uint) external pure returns (uint);
    function calcLiquidityHoldings(uint, address, address) external pure returns (uint);
    function calcSwapOutput(uint, uint, uint) external pure returns (uint);
    function calcSwapFee(uint, uint, uint) external pure returns (uint);
    function calcSwapValueInBase(address, uint) external view returns (uint);
    function calcSpotValueInBaseWithPool(address, uint) external view returns (uint);
    function calcSpotValueInBase(address, uint) external view returns (uint);
    function calcSpotValueIn(address, uint) external view returns (uint);
    function calcPart(uint, uint) external pure returns (uint);
    function calcLiquidityUnitsAsym(uint, address)external pure returns (uint);
    function calcActualSynthUnits(uint amount, address synth) external view returns (uint);
}

interface iBASE {
    function DAO() external view returns (iDAO);
    function secondsPerEra() external view returns (uint256);
    function changeDAO(address) external;
    function setParams(uint256, uint256) external;
    function flipEmissions() external;
    function mintFromDAO(uint256, address) external;
    function burn(uint256) external;
}

contract Pool is iBEP20 {
    address public BASE;
    address public TOKEN;
    address public DEPLOYER;

    string _name; string _symbol;
    uint8 public override decimals; uint256 public override totalSupply;
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    uint256 public baseAmount;
    uint256 public tokenAmount;

    uint private lastMonth;
    uint public genesis;

    uint256 public map30DPoolRevenue;
    uint256 public mapPast30DPoolRevenue;
    uint256 [] public revenueArray;

    event AddLiquidity(address indexed member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address indexed member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address indexed tokenFrom, address indexed tokenTo, address indexed recipient, uint inputAmount, uint outputAmount, uint fee);
    event MintSynth(address indexed member, address indexed base, uint256 baseAmount, address indexed token, uint256 synthAmount);
    event BurnSynth(address indexed member, address indexed base, uint256 baseAmount, address indexed token, uint256 synthAmount);

    function _DAO() internal view returns (iDAO) {
        return iBASE(BASE).DAO();
    }

    constructor (address _base, address _token) {
        BASE = _base;
        TOKEN = _token;
        string memory poolName = "-SpartanProtocolPool";
        string memory poolSymbol = "-SPP";
        _name = string(abi.encodePacked(iBEP20(_token).name(), poolName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), poolSymbol));
        decimals = 18;
        genesis = block.timestamp;
        DEPLOYER = payable(msg.sender);
        lastMonth = 0;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender]+(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "!approval");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "!owner");
        require(spender != address(0), "!spender");
        if (_allowances[owner][spender] < type(uint256).max) {
            _allowances[owner][spender] = amount;
            emit Approval(owner, spender, amount);
        }
    }

    function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        if (_allowances[sender][msg.sender] < type(uint256).max) {
            uint256 currentAllowance = _allowances[sender][msg.sender];
            require(currentAllowance >= amount, "!approval");
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        return true;
    }

    function approveAndCall(address recipient, uint amount, bytes calldata data) external returns (bool) {
      _approve(msg.sender, recipient, type(uint256).max);
      iBEP677(recipient).onTokenApproval(address(this), amount, msg.sender, data);
      return true;
    }

    function transferAndCall(address recipient, uint amount, bytes calldata data) external returns (bool) {
      _transfer(msg.sender, recipient, amount);
      iBEP677(recipient).onTokenTransfer(address(this), amount, msg.sender, data);
      return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "!sender");
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "!balance");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function burn(uint256 amount) external virtual override {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external virtual {
        uint256 decreasedAllowance = allowance(account, msg.sender) - (amount);
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        require(_balances[account] >= amount, "!balance");
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function add() external returns (uint liquidityUnits){
        liquidityUnits = addForMember(msg.sender);
        return liquidityUnits;
    }

    function addForMember(address member) public returns (uint liquidityUnits){
        uint256 _actualInputBase = _getAddedBaseAmount();
        uint256 _actualInputToken = _getAddedTokenAmount();
        if(baseAmount == 0 || tokenAmount == 0){
        require(_actualInputBase != 0 && _actualInputToken != 0, "!Balanced");
        }
        liquidityUnits = iUTILS(_DAO().UTILS()).calcLiquidityUnits(_actualInputBase, baseAmount, _actualInputToken, tokenAmount, totalSupply);
        _incrementPoolBalances(_actualInputBase, _actualInputToken);
        _mint(member, liquidityUnits);
        emit AddLiquidity(member, _actualInputBase, _actualInputToken, liquidityUnits);
        return liquidityUnits;
    }

    function remove() external returns (uint outputBase, uint outputToken) {
        return removeForMember(msg.sender);
    }

    function removeForMember(address member) public returns (uint outputBase, uint outputToken) {
        uint256 _actualInputUnits = balanceOf(address(this));
        outputBase = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(_actualInputUnits, BASE, address(this));
        outputToken = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(_actualInputUnits, TOKEN, address(this));
        _decrementPoolBalances(outputBase, outputToken);
        _burn(address(this), _actualInputUnits);
        iBEP20(BASE).transfer(member, outputBase);
        iBEP20(TOKEN).transfer(member, outputToken);
        emit RemoveLiquidity(member, outputBase, outputToken, _actualInputUnits);
        return (outputBase, outputToken);
    }

    function swap(address token) external returns (uint outputAmount, uint fee){
        (outputAmount, fee) = swapTo(token, msg.sender);
        return (outputAmount, fee);
    }

    function swapTo(address token, address member) public payable returns (uint outputAmount, uint fee) {
        require((token == BASE || token == TOKEN), "!BASE||TOKEN");
        address _fromToken; uint _amount;
        if(token == BASE){
            _fromToken = TOKEN;
            _amount = _getAddedTokenAmount();
            (outputAmount, fee) = _swapTokenToBase(_amount);
        } else {
            _fromToken = BASE;
            _amount = _getAddedBaseAmount();
            (outputAmount, fee) = _swapBaseToToken(_amount);
        }
        emit Swapped(_fromToken, token, member, _amount, outputAmount, fee);
        iBEP20(token).transfer(member, outputAmount);
        return (outputAmount, fee);
    }

    function mintSynth(address synthOut, address member) external returns (uint outputAmount, uint fee) {
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synthOut) == true, "!synth");
        uint256 _actualInputBase = _getAddedBaseAmount();
        uint output = iUTILS(_DAO().UTILS()).calcSwapOutput(_actualInputBase, baseAmount, tokenAmount);
        uint _liquidityUnits = iUTILS(_DAO().UTILS()).calcLiquidityUnitsAsym(_actualInputBase, address(this));
        _incrementPoolBalances(_actualInputBase, 0);
        uint _fee = iUTILS(_DAO().UTILS()).calcSwapFee(_actualInputBase, baseAmount, tokenAmount);
        fee = iUTILS(_DAO().UTILS()).calcSpotValueInBase(TOKEN, _fee);
        _mint(synthOut, _liquidityUnits);
        iSYNTH(synthOut).mintSynth(member, output);
        _addPoolMetrics(fee);
        emit MintSynth(member, BASE, _actualInputBase, TOKEN, outputAmount);
      return (output, fee);
    }

    function burnSynth(address synthIN, address member) external returns (uint outputAmount, uint fee) {
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synthIN) == true, "!synth");
        uint _actualInputSynth = iBEP20(synthIN).balanceOf(address(this));
        uint outputBase = iUTILS(_DAO().UTILS()).calcSwapOutput(_actualInputSynth, tokenAmount, baseAmount);
        fee = iUTILS(_DAO().UTILS()).calcSwapFee(_actualInputSynth, tokenAmount, baseAmount);
        iBEP20(synthIN).transfer(synthIN, _actualInputSynth);
        iSYNTH(synthIN).burnSynth();
        _decrementPoolBalances(outputBase, 0);
        iBEP20(BASE).transfer(member, outputBase);
        _addPoolMetrics(fee);
        emit BurnSynth(member, BASE, outputBase, TOKEN, _actualInputSynth);
      return (outputBase, fee);
    }

    function _getAddedBaseAmount() internal view returns (uint256 _actual){
        uint _baseBalance = iBEP20(BASE).balanceOf(address(this));
        if(_baseBalance > baseAmount){
            _actual = _baseBalance-(baseAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function _getAddedTokenAmount() internal view returns (uint256 _actual){
        uint _tokenBalance = iBEP20(TOKEN).balanceOf(address(this));
        if(_tokenBalance > tokenAmount){
            _actual = _tokenBalance-(tokenAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function _swapBaseToToken(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = baseAmount;
        uint256 _Y = tokenAmount;
        _y =  iUTILS(_DAO().UTILS()).calcSwapOutput(_x, _X, _Y);
        uint fee = iUTILS(_DAO().UTILS()).calcSwapFee(_x, _X, _Y);
        _fee = iUTILS(_DAO().UTILS()).calcSpotValueInBase(TOKEN, fee);
        _setPoolAmounts(_X + _x, _Y - _y);
        _addPoolMetrics(_fee);
        return (_y, _fee);
    }

    function _swapTokenToBase(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = tokenAmount;
        uint256 _Y = baseAmount;
        _y =  iUTILS(_DAO().UTILS()).calcSwapOutput(_x, _X, _Y);
        _fee = iUTILS(_DAO().UTILS()).calcSwapFee(_x, _X, _Y);
        _setPoolAmounts(_Y - _y, _X + _x);
        _addPoolMetrics(_fee);
        return (_y, _fee);
    }

    function sync() external {
        baseAmount = iBEP20(BASE).balanceOf(address(this));
        tokenAmount = iBEP20(TOKEN).balanceOf(address(this));
    }

    function _incrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount += _baseAmount;
        tokenAmount += _tokenAmount;
    }

    function _setPoolAmounts(uint256 _baseAmount, uint256 _tokenAmount) internal  {
        baseAmount = _baseAmount;
        tokenAmount = _tokenAmount;
    }

    function _decrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount -= _baseAmount;
        tokenAmount -= _tokenAmount;
    }

    function _addPoolMetrics(uint256 _fee) internal {
        if(lastMonth == 0){
            lastMonth = block.timestamp;
        }
        if(block.timestamp <= lastMonth + 2592000){
            map30DPoolRevenue = map30DPoolRevenue+(_fee);
        } else {
            lastMonth = block.timestamp;
            mapPast30DPoolRevenue = map30DPoolRevenue;
            addRevenue(mapPast30DPoolRevenue);
            map30DPoolRevenue = 0;
            map30DPoolRevenue = map30DPoolRevenue+(_fee);
        }
    }

    function addRevenue(uint _totalRev) internal {
        if(!(revenueArray.length == 2)){
            revenueArray.push(_totalRev);
        } else {
            addFee(_totalRev);
        }
    }

    function addFee(uint _rev) internal {
        uint _n = revenueArray.length;
        for (uint i = _n - 1; i > 0; i--) {
            revenueArray[i] = revenueArray[i - 1];
        }
        revenueArray[0] = _rev;
    }
}

contract Synth is iBEP20 {
    address public BASE;
    address public LayerONE;
    uint public genesis;
    address public DEPLOYER;

    string _name; string _symbol;
    uint8 public override decimals; uint256 public override totalSupply;

    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;
    mapping(address => uint) public mapSynth_LPBalance;
    mapping(address => uint) public mapSynth_LPDebt;

    function _DAO() internal view returns (iDAO) {
        return iBASE(BASE).DAO();
    }

    modifier onlyDAO() {
        require(msg.sender == DEPLOYER, "!DAO");
        _;
    }

    modifier onlyPool() {
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(msg.sender) == true, "!curated");
        _;
    }

    constructor (address _base, address _token) {
        BASE = _base;
        LayerONE = _token;
        string memory synthName = "-SpartanProtocolSynthetic";
        string memory synthSymbol = "-SPS";
        _name = string(abi.encodePacked(iBEP20(_token).name(), synthName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), synthSymbol));
        decimals = iBEP20(_token).decimals();
        DEPLOYER = payable(msg.sender);
        genesis = block.timestamp;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender]+(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "!approval");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "!owner");
        require(spender != address(0), "!spender");
        if (_allowances[owner][spender] < type(uint256).max) {
            _allowances[owner][spender] = amount;
            emit Approval(owner, spender, amount);
        }
    }

    function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        if (_allowances[sender][msg.sender] < type(uint256).max) {
            uint256 currentAllowance = _allowances[sender][msg.sender];
            require(currentAllowance >= amount, "!approval");
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        return true;
    }

    function approveAndCall(address recipient, uint amount, bytes calldata data) external returns (bool) {
        _approve(msg.sender, recipient, type(uint256).max);
        iBEP677(recipient).onTokenApproval(address(this), amount, msg.sender, data);
        return true;
    }

    function transferAndCall(address recipient, uint amount, bytes calldata data) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        iBEP677(recipient).onTokenTransfer(address(this), amount, msg.sender, data);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "!sender");
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "!balance");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function burn(uint256 amount) external virtual override {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external virtual {
        uint256 decreasedAllowance = allowance(account, msg.sender) - (amount);
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        require(_balances[account] >= amount, "!balance");
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function mintSynth(address member, uint amount) external onlyPool returns (uint syntheticAmount){
        uint lpUnits = _getAddedLPAmount(msg.sender);
        mapSynth_LPDebt[msg.sender] += amount;
        mapSynth_LPBalance[msg.sender] += lpUnits;
        _mint(member, amount);
        return amount;
    }

    function burnSynth() external returns (bool){
        uint _syntheticAmount = balanceOf(address(this));
        uint _amountUnits = (_syntheticAmount * mapSynth_LPBalance[msg.sender]) / mapSynth_LPDebt[msg.sender];
        mapSynth_LPBalance[msg.sender] -= _amountUnits;
        mapSynth_LPDebt[msg.sender] -= _syntheticAmount;
        if(_amountUnits > 0){
            _burn(address(this), _syntheticAmount);
            Pool(msg.sender).burn(_amountUnits);
        }
        return true;
    }

    function realise(address pool) external {
        uint baseValueLP = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(mapSynth_LPBalance[pool], BASE, pool);
        uint baseValueSynth = iUTILS(_DAO().UTILS()).calcActualSynthUnits(mapSynth_LPDebt[pool], address(this));
        if(baseValueLP > baseValueSynth){
            uint premium = baseValueLP - baseValueSynth;
            if(premium > 10**18){
                uint premiumLP = iUTILS(_DAO().UTILS()).calcLiquidityUnitsAsym(premium, pool);
                mapSynth_LPBalance[pool] -= premiumLP;
                Pool(pool).burn(premiumLP);
            }
        }
    }

    function _handleTransferIn(address _token, uint256 _amount) internal returns (uint256 _actual){
        if(_amount > 0) {
            uint startBal = iBEP20(_token).balanceOf(address(this));
            iBEP20(_token).transferFrom(msg.sender, address(this), _amount);
            _actual = iBEP20(_token).balanceOf(address(this)) - startBal;
        }
        return _actual;
    }

    function _getAddedLPAmount(address _pool) internal view returns (uint256 _actual){
        uint _lpCollateralBalance = iBEP20(_pool).balanceOf(address(this));
        if(_lpCollateralBalance > mapSynth_LPBalance[_pool]){
            _actual = _lpCollateralBalance - mapSynth_LPBalance[_pool];
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function getmapAddress_LPBalance(address pool) external view returns (uint){
        return mapSynth_LPBalance[pool];
    }

    function getmapAddress_LPDebt(address pool) external view returns (uint){
        return mapSynth_LPDebt[pool];
    }
}
