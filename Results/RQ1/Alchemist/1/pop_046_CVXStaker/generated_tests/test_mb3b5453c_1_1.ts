import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CVXStaker, IBaseRewardPool, ICVXBooster, IERC20 } from "../typechain-types";

describe("CVXStaker - kill mutant mb3b5453c", function () {
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let clpToken: IERC20;
  let booster: ICVXBooster;
  let cvxStaker: CVXStaker;
  let mockRewards: IBaseRewardPool;
  const PID = 1;
  const REWARD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000001"; // placeholder

  before(async function () {
    [owner, operator, user] = await ethers.getSigners();

    // Deploy mock CLP token
    const ERC20Factory = await ethers.getContractFactory("TestERC20");
    clpToken = await ERC20Factory.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    // Deploy mock booster
    const BoosterFactory = await ethers.getContractFactory("MockBooster");
    booster = await BoosterFactory.deploy();
    await booster.waitForDeployment();

    // Deploy mock rewards pool
    const RewardsFactory = await ethers.getContractFactory("MockRewards");
    mockRewards = await RewardsFactory.deploy();
    await mockRewards.waitForDeployment();

    // Setup mock booster pool info
    await booster.setPoolInfo(PID, {
      lptoken: await clpToken.getAddress(),
      token: REWARD_TOKEN_ADDRESS,
      gauge: ethers.ZeroAddress,
      crvRewards: await mockRewards.getAddress(),
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Deploy CVXStaker
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    cvxStaker = await CVXStakerFactory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      [REWARD_TOKEN_ADDRESS]
    );
    await cvxStaker.waitForDeployment();

    // Setup CVX pool info
    await cvxStaker.setCvxPoolInfo(PID, await clpToken.getAddress(), await mockRewards.getAddress());
    await cvxStaker.setOperator(operator.address);

    // Fund operator with CLP tokens
    await clpToken.mint(operator.address, ethers.parseEther("1000"));
    await clpToken.connect(operator).approve(await cvxStaker.getAddress(), ethers.parseEther("1000"));
  });

  it("should kill mutant by requiring unstaking when amount exceeds contract balance", async function () {
    // Step 1: Deposit tokens via operator to stake in rewards pool
    const depositAmount = ethers.parseEther("100");
    await cvxStaker.connect(operator).depositAndStake(depositAmount);

    // Verify tokens were staked in rewards pool
    const stakedBalance = await mockRewards.balanceOf(await cvxStaker.getAddress());
    expect(stakedBalance).to.equal(depositAmount);

    // Step 2: Call withdrawAndUnwrap with amount larger than contract's CLP balance
    // The contract has 0 CLP tokens directly (all are staked), so toUnstake = amount - 0 = amount
    const withdrawAmount = ethers.parseEther("50");
    const recipient = user.address;

    // This should unstake from rewards and transfer to recipient
    await cvxStaker.connect(operator).withdrawAndUnwrap(withdrawAmount, false, recipient);

    // Step 3: Verify recipient received the tokens
    const recipientBalance = await clpToken.balanceOf(recipient);
    expect(recipientBalance).to.equal(withdrawAmount);

    // Step 4: Verify contract's CLP balance is still 0 (all tokens went to recipient)
    const contractBalance = await clpToken.balanceOf(await cvxStaker.getAddress());
    expect(contractBalance).to.equal(0);

    // Step 5: Verify rewards pool balance decreased accordingly
    const remainingStaked = await mockRewards.balanceOf(await cvxStaker.getAddress());
    expect(remainingStaked).to.equal(depositAmount - withdrawAmount);
  });
});