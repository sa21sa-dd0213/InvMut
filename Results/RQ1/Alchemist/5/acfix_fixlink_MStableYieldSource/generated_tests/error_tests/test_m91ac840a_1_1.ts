import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m91ac840a - reentrancy guard removal", function () {
  let owner: any;
  let attacker: any;
  let savingsMock: any;
  let mAssetMock: any;
  let yieldSource: any;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();

    // Deploy mock savings contract that calls back into attacker on depositSavings
    const savingsArtifact = await ethers.getContractFactory(
      `contract MockSavings {
        IERC20 public underlying;
        address public attacker;
        uint256 public exchangeRate = 1e18;
        constructor(address _underlying, address _attacker) {
          underlying = IERC20(_underlying);
          attacker = _attacker;
        }
        function depositSavings(uint256 amount) external returns (uint256) {
          // Trigger reentrancy before returning credits
          (bool success,) = attacker.call(abi.encodeWithSignature('onDepositSavings()'));
          require(success, 'callback failed');
          return amount; // 1:1 credits for simplicity
        }
        function redeemUnderlying(uint256 amount) external returns (uint256) {
          return amount;
        }
        function exchangeRate() external view returns (uint256) {
          return exchangeRate;
        }
        function underlying() external view returns (IERC20) {
          return underlying;
        }
      }`
    );

    // Deploy mock mAsset token
    const mAssetArtifact = await ethers.getContractFactory(
      `contract MockERC20 {
        mapping(address => uint256) public balanceOf;
        function transferFrom(address from, address to, uint256 amount) external returns (bool) {
          balanceOf[from] -= amount;
          balanceOf[to] += amount;
          return true;
        }
        function approve(address spender, uint256 amount) external returns (bool) {
          return true;
        }
        function transfer(address to, uint256 amount) external returns (bool) {
          balanceOf[msg.sender] -= amount;
          balanceOf[to] += amount;
          return true;
        }
        function allowance(address, address) external view returns (uint256) {
          return type(uint256).max;
        }
      }`
    );

    mAssetMock = await mAssetArtifact.deploy();
    await mAssetMock.waitForDeployment();

    savingsMock = await savingsArtifact.deploy(
      await mAssetMock.getAddress(),
      await attacker.getAddress()
    );
    await savingsMock.waitForDeployment();

    // Deploy the yield source (mutant version without nonReentrant)
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    yieldSource = await Factory.deploy(await savingsMock.getAddress());
    await yieldSource.waitForDeployment();

    // Fund attacker with mAsset tokens
    await mAssetMock.balanceOf[owner.getAddress()] = ethers.parseEther("1000");
    await mAssetMock.transferFrom(
      owner.getAddress(),
      await attacker.getAddress(),
      ethers.parseEther("10")
    );
  });

  it("should revert on reentrancy when nonReentrant modifier is present (original behavior)", async function () {
    // Deploy attacker contract
    const attackerFactory = await ethers.getContractFactory(
      `contract ReentrancyAttacker {
        MStableYieldSource target;
        uint256 attackAmount;
        address attacker;
        bool attackPerformed;
        constructor(address _target, uint256 _amount, address _attacker) {
          target = MStableYieldSource(_target);
          attackAmount = _amount;
          attacker = _attacker;
        }
        function attack() external {
          target.supplyTokenTo(attackAmount, attacker);
        }
        function onDepositSavings() external {
          if (!attackPerformed) {
            attackPerformed = true;
            target.supplyTokenTo(attackAmount, attacker);
          }
        }
      }
      interface MStableYieldSource {
        function supplyTokenTo(uint256 mAssetAmount, address to) external;
      }`
    );

    const attackerContract = await attackerFactory.deploy(
      await yieldSource.getAddress(),
      ethers.parseEther("1"),
      await attacker.getAddress()
    );
    await attackerContract.waitForDeployment();

    await expect(
      attackerContract.connect(attacker).attack()
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
});