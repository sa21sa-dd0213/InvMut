import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when withdrawGovernanceAsset is called exactly at unlockTime (mutant mb1162113)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the FlashGovernanceArbiter contract
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(owner.address);
    await arbiter.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const ERC20Mock = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Mock.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Setup: configure flash governance parameters
    const unlockTime = 3600; // 1 hour in seconds
    await arbiter.connect(owner).configureFlashGovernance(
      await token.getAddress(),
      ethers.parseEther("10"),
      unlockTime,
      false
    );

    // Setup: set governed address to allow the test
    await arbiter.connect(owner).setGoverned([addr1.address], [true]);

    // Fund addr1 with tokens and approve
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await arbiter.getAddress(), ethers.parseEther("100"));

    // First, call assertGovernanceApproved to create a pending flash decision
    const targetContract = addr1.address;
    await arbiter.connect(addr1).assertGovernanceApproved(
      addr1.address,
      targetContract,
      false
    );

    // Get the stored pending decision to check unlockTime
    const pendingDecision = await arbiter.pendingFlashDecision(targetContract, addr1.address);
    const storedUnlockTime = pendingDecision.unlockTime;

    // Now we need to advance time to exactly the unlockTime
    // The unlockTime was set as block.timestamp + unlockTime from config
    // We need to fast forward to exactly that timestamp

    // Mine a block at exactly the unlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(storedUnlockTime)]);
    await ethers.provider.send("evm_mine");

    // Now call withdrawGovernanceAsset at exactly unlockTime (should revert in original, pass in mutant)
    await expect(
      arbiter.connect(addr1).withdrawGovernanceAsset(targetContract, await token.getAddress())
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
  });
});