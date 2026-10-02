// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library AddressUpgradeable {

    function isContract(address account) internal view returns (bool) {

        return account.code.length > 0;
    }

    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, "Address: low-level call failed");
    }

    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata, errorMessage);
    }

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata, errorMessage);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResultFromTarget(target, success, returndata, errorMessage);
    }

    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        if (success) {
            if (returndata.length == 0) {

                require(isContract(target), "Address: call to non-contract");
            }
            return returndata;
        } else {
            _revert(returndata, errorMessage);
        }
    }

    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {
            _revert(returndata, errorMessage);
        }
    }

    function _revert(bytes memory returndata, string memory errorMessage) private pure {

        if (returndata.length > 0) {

            assembly {
                let returndata_size := mload(returndata)
                revert(add(32, returndata), returndata_size)
            }
        } else {
            revert(errorMessage);
        }
    }
}

library FullMath {
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256) {
        return (a * b) / denominator;
    }
}

interface IDnGmxBatchingManager {
    error NoUsdcBalance();
    error CallerNotVault();
    error CallerNotKeeper();
    error InvalidInput(uint256 errorCode);
    error InsufficientShares(uint256 balance);

    event DepositToken(uint256 indexed round, address indexed token, address indexed receiver, uint256 amount, uint256 glpStaked);
    event KeeperUpdated(address newKeeper);
    event ThresholdsUpdated(uint256 newSlippageThresholdGmx);
    event BatchStake(uint256 indexed round, uint256 userUsdcAmount, uint256 userGlpAmount);
    event SharesClaimed(address indexed from, address indexed receiver, uint256 claimAmount);
    event BatchDeposit(uint256 indexed round, uint256 userUsdcAmount, uint256 userGlpAmount, uint256 userShareAmount);
    event ClaimedAndRedeemed(address indexed claimer, address indexed receiver, uint256 shares, uint256 assetsReceived);
    event VaultDeposit(uint256 glpAmount);

    struct UserDeposit {
        uint256 round;
        uint128 usdcBalance;
        uint128 unclaimedShares;
    }

    struct RoundDeposit {
        uint128 totalUsdc;
        uint128 totalShares;
    }
}

interface IDnGmxJuniorVault {
    function harvestFees() external;
    function balanceOf(address account) external view returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IERC20 {

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IGlpManager {
    function vault() external view returns (address);
}

interface IRewardRouterV2 {
    function mintAndStakeGlp(address token, uint256 amount, uint256 minUsdg, uint256 minGlp) external returns (uint256);
}

interface IVault {
    function getMinPrice(address token) external view returns (uint256);
}

library SafeCast {
    function toUint128(uint256 x) internal pure returns (uint128) {
        require(x <= type(uint128).max, "SafeCast: overflow");
        return uint128(x);
    }
}

abstract contract Initializable {

    uint8 private _initialized;

    bool private _initializing;

    event Initialized(uint8 version);

    modifier initializer() {
        bool isTopLevelCall = !_initializing;
        require(
            (isTopLevelCall && _initialized < 1) || (!AddressUpgradeable.isContract(address(this)) && _initialized == 1),
            "Initializable: contract is already initialized"
        );
        _initialized = 1;
        if (isTopLevelCall) {
            _initializing = true;
        }
        _;
        if (isTopLevelCall) {
            _initializing = false;
            emit Initialized(1);
        }
    }

    modifier reinitializer(uint8 version) {
        require(!_initializing && _initialized < version, "Initializable: contract is already initialized");
        _initialized = version;
        _initializing = true;
        _;
        _initializing = false;
        emit Initialized(version);
    }

    modifier onlyInitializing() {
        require(_initializing, "Initializable: contract is not initializing");
        _;
    }

    function _disableInitializers() internal virtual {
        require(!_initializing, "Initializable: contract is initializing");
        if (_initialized != type(uint8).max) {
            _initialized = type(uint8).max;
            emit Initialized(type(uint8).max);
        }
    }

    function _getInitializedVersion() internal view returns (uint8) {
        return _initialized;
    }

    function _isInitializing() internal view returns (bool) {
        return _initializing;
    }
}

abstract contract ContextUpgradeable is Initializable {
    function __Context_init() internal onlyInitializing {
    }

    function __Context_init_unchained() internal onlyInitializing {
    }
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    uint256[50] private __gap;
}

abstract contract OwnableUpgradeable is Initializable, ContextUpgradeable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function __Ownable_init() internal onlyInitializing {
        __Ownable_init_unchained();
    }

    function __Ownable_init_unchained() internal onlyInitializing {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    uint256[49] private __gap;
}

abstract contract PausableUpgradeable is Initializable, ContextUpgradeable {

    event Paused(address account);

    event Unpaused(address account);

    bool private _paused;

    function __Pausable_init() internal onlyInitializing {
        __Pausable_init_unchained();
    }

    function __Pausable_init_unchained() internal onlyInitializing {
        _paused = false;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        require(!paused(), "Pausable: paused");
    }

    function _requirePaused() internal view virtual {
        require(paused(), "Pausable: not paused");
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }

    uint256[49] private __gap;
}

contract DnGmxBatchingManager is IDnGmxBatchingManager, OwnableUpgradeable, PausableUpgradeable {
    using FullMath for uint256;
    using FullMath for uint128;
    using SafeCast for uint256;

    struct VaultBatchingState {

        uint256 currentRound;

        uint256 roundGlpStaked;

        uint256 roundUsdcBalance;

        mapping(address => UserDeposit) userDeposits;

        mapping(uint256 => RoundDeposit) roundDeposits;
    }

    uint256 private constant MAX_BPS = 10_000;

    uint256[100] private _gaps;

    address public keeper;

    IDnGmxJuniorVault public dnGmxJuniorVault;

    uint256 public slippageThresholdGmxBps;

    uint256 public dnGmxJuniorVaultGlpBalance;

    IERC20 private sGlp;

    IERC20 private usdc;

    IGlpManager private glpManager;

    IVault private gmxUnderlyingVault;

    IRewardRouterV2 private rewardRouter;

    VaultBatchingState public vaultBatchingState;

    uint256[50] private __gaps2;

    modifier onlyDnGmxJuniorVault() {
        if (msg.sender != address(dnGmxJuniorVault)) revert CallerNotVault();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert CallerNotKeeper();
        _;
    }

    function initialize(
        IERC20 _sGlp,
        IERC20 _usdc,
        IRewardRouterV2 _rewardRouter,
        IGlpManager _glpManager,
        address _dnGmxJuniorVault,
        address _keeper
    ) external initializer {
        __Ownable_init();
        __Pausable_init();
        __GMXBatchingManager_init(_sGlp, _usdc, _rewardRouter, _glpManager, _dnGmxJuniorVault, _keeper);
    }

    function __GMXBatchingManager_init(
        IERC20 _sGlp,
        IERC20 _usdc,
        IRewardRouterV2 _rewardRouter,
        IGlpManager _glpManager,
        address _dnGmxJuniorVault,
        address _keeper
    ) internal onlyInitializing {
        sGlp = _sGlp;
        usdc = _usdc;
        glpManager = _glpManager;
        rewardRouter = _rewardRouter;

        gmxUnderlyingVault = IVault(glpManager.vault());
        dnGmxJuniorVault = IDnGmxJuniorVault(_dnGmxJuniorVault);

        keeper = _keeper;
        emit KeeperUpdated(_keeper);

        vaultBatchingState.currentRound = 1;
    }

    function grantAllowances() external onlyOwner {
        sGlp.approve(address(dnGmxJuniorVault), type(uint256).max);
    }

    function setKeeper(address _keeper) external onlyOwner {
        keeper = _keeper;
        emit KeeperUpdated(_keeper);
    }

    function setThresholds(uint256 _slippageThresholdGmxBps) external onlyOwner {
        slippageThresholdGmxBps = _slippageThresholdGmxBps;
        emit ThresholdsUpdated(_slippageThresholdGmxBps);
    }

    function pauseDeposit() external onlyKeeper {
        _pause();
    }

    function unpauseDeposit() external onlyKeeper {
        _unpause();
    }

    function depositToken(
        address token,
        uint256 amount,
        uint256 minUSDG
    ) external whenNotPaused onlyDnGmxJuniorVault returns (uint256 glpStaked) {

        if (token == address(0)) revert InvalidInput(0x30);
        if (amount == 0) revert InvalidInput(0x31);

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        glpStaked = _stakeGlp(token, amount, minUSDG);
        dnGmxJuniorVaultGlpBalance += glpStaked.toUint128();

        emit DepositToken(0, token, msg.sender, amount, glpStaked);
    }

    function depositUsdc(uint256 amount, address receiver) external whenNotPaused returns (uint256 glpStaked) {

        if (amount == 0) revert InvalidInput(0x21);
        if (receiver == address(0)) revert InvalidInput(0x22);

        usdc.transferFrom(msg.sender, address(this), amount);

        UserDeposit storage userDeposit = vaultBatchingState.userDeposits[receiver];
        uint128 userUsdcBalance = userDeposit.usdcBalance;

        uint256 userDepositRound = userDeposit.round;
        if (userDepositRound < vaultBatchingState.currentRound && userUsdcBalance > 0) {

            RoundDeposit storage roundDeposit = vaultBatchingState.roundDeposits[userDepositRound];
            userDeposit.unclaimedShares += userDeposit
                .usdcBalance
                .mulDiv(roundDeposit.totalShares, roundDeposit.totalUsdc)
                .toUint128();
            userUsdcBalance = 0;
        }

        userDeposit.round = vaultBatchingState.currentRound;
        userDeposit.usdcBalance = userUsdcBalance + amount.toUint128();
        vaultBatchingState.roundUsdcBalance += amount.toUint128();

        emit DepositToken(vaultBatchingState.currentRound, address(usdc), receiver, amount, glpStaked);
    }

    function executeBatchStake() external whenNotPaused onlyKeeper {

        dnGmxJuniorVault.harvestFees();

        _executeVaultUserBatchStake();

        _pause();
    }

    function executeBatchDeposit() external onlyKeeper {
    require(block.timestamp > lastUnpauseTimestamp + 15 minutes, "Cooldown period not passed");

    lastUnpauseTimestamp = block.timestamp;

    if (paused()) _unpause();

    if (dnGmxJuniorVaultGlpBalance > 0) {
        uint256 glpToTransfer = dnGmxJuniorVaultGlpBalance;
        dnGmxJuniorVaultGlpBalance = 0;
        sGlp.transfer(address(dnGmxJuniorVault), glpToTransfer);
        emit VaultDeposit(glpToTransfer);
    }

    _executeVaultUserBatchDeposit();
}

uint256 private lastUnpauseTimestamp;

    function claim(address receiver, uint256 amount) external {
        _claim(msg.sender, receiver, amount);
    }

    function claimAndRedeem(address receiver) external returns (uint256 glpReceived) {

        _claim(msg.sender, msg.sender, unclaimedShares(msg.sender));

        uint256 shares = dnGmxJuniorVault.balanceOf(msg.sender);
        if (shares == 0) return 0;

        glpReceived = dnGmxJuniorVault.redeem(shares, receiver, msg.sender);

        emit ClaimedAndRedeemed(msg.sender, receiver, shares, glpReceived);
    }

    function currentRound() external view returns (uint256) {
        return vaultBatchingState.currentRound;
    }

    function usdcBalance(address account) public view returns (uint256 balance) {
        balance = vaultBatchingState.userDeposits[account].usdcBalance;
    }

    function unclaimedShares(address account) public view returns (uint256 shares) {
        UserDeposit memory userDeposit = vaultBatchingState.userDeposits[account];
        shares = userDeposit.unclaimedShares;

        if (userDeposit.round < vaultBatchingState.currentRound && userDeposit.usdcBalance > 0) {
            RoundDeposit memory roundDeposit = vaultBatchingState.roundDeposits[userDeposit.round];
            shares += userDeposit.usdcBalance.mulDiv(roundDeposit.totalShares, roundDeposit.totalUsdc).toUint128();
        }
    }

    function roundUsdcBalance() external view returns (uint256) {
        return vaultBatchingState.roundUsdcBalance;
    }

    function roundGlpStaked() external view returns (uint256) {
        return vaultBatchingState.roundGlpStaked;
    }

    function userDeposits(address account) external view returns (UserDeposit memory) {
        return vaultBatchingState.userDeposits[account];
    }

    function roundDeposits(uint256 round) external view returns (RoundDeposit memory) {
        return vaultBatchingState.roundDeposits[round];
    }

    function _stakeGlp(
        address token,
        uint256 amount,
        uint256 minUSDG
    ) internal returns (uint256 glpStaked) {

        IERC20(token).approve(address(glpManager), amount);

        glpStaked = rewardRouter.mintAndStakeGlp(token, amount, minUSDG, 0);
    }

    function _executeVaultUserBatchStake() internal {
        uint256 _roundUsdcBalance = vaultBatchingState.roundUsdcBalance;

        if (_roundUsdcBalance == 0) revert NoUsdcBalance();

        uint256 price = gmxUnderlyingVault.getMinPrice(address(usdc));

        uint256 minUsdg = _roundUsdcBalance.mulDiv(price * 1e12 * (MAX_BPS - slippageThresholdGmxBps), 1e30 * MAX_BPS);

        vaultBatchingState.roundGlpStaked = _stakeGlp(address(usdc), _roundUsdcBalance, minUsdg);

        emit BatchStake(vaultBatchingState.currentRound, _roundUsdcBalance, vaultBatchingState.roundGlpStaked);
    }

    function _executeVaultUserBatchDeposit() internal {

        if (vaultBatchingState.roundGlpStaked == 0) return;

        uint256 totalShares = dnGmxJuniorVault.deposit(vaultBatchingState.roundGlpStaked, address(this));

        vaultBatchingState.roundDeposits[vaultBatchingState.currentRound] = RoundDeposit(
            vaultBatchingState.roundUsdcBalance.toUint128(),
            totalShares.toUint128()
        );

        emit BatchDeposit(
            vaultBatchingState.currentRound,
            vaultBatchingState.roundUsdcBalance,
            vaultBatchingState.roundGlpStaked,
            totalShares
        );

        vaultBatchingState.roundUsdcBalance = 0;
        vaultBatchingState.roundGlpStaked = 0;
        ++vaultBatchingState.currentRound;
    }

    function _claim(
        address claimer,
        address receiver,
        uint256 amount
    ) internal {

        if (receiver == address(0)) revert InvalidInput(0x10);
        if (amount == 0) revert InvalidInput(0x11);

        UserDeposit storage userDeposit = vaultBatchingState.userDeposits[claimer];

        uint128 userUsdcBalance = userDeposit.usdcBalance;
        uint128 userUnclaimedShares = userDeposit.unclaimedShares;

        {

            uint256 userDepositRound = userDeposit.round;
            if (userDepositRound < vaultBatchingState.currentRound && userUsdcBalance > 0) {
                RoundDeposit storage roundDeposit = vaultBatchingState.roundDeposits[userDepositRound];
                userUnclaimedShares += userUsdcBalance
                    .mulDiv(roundDeposit.totalShares, roundDeposit.totalUsdc)
                    .toUint128();
                userDeposit.usdcBalance = 0;
            }
        }

        if (userUnclaimedShares < amount.toUint128()) revert InsufficientShares(userUnclaimedShares);
        userDeposit.unclaimedShares = userUnclaimedShares - amount.toUint128();

        dnGmxJuniorVault.transfer(receiver, amount);

        emit SharesClaimed(claimer, receiver, amount);
    }
}
