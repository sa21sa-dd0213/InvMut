import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test", function () {
  it("should succeed when valid governance decision is made with correct token transfer and timing", async function () {
    const [owner, dao, sender, target] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy mock LimboDAO
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockLimboDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter with DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiter.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();

    // Configure DAO in arbiter
    await arbiter.connect(dao).setDAO(await mockDAO.getAddress());

    // Setup: approve sender as governed
    await arbiter.connect(dao).setGoverned([await sender.getAddress()], [true]);

    // Configure flash governance parameters
    const amount = ethers.parseEther("100");
    const unlockTime = 3600; // 1 hour
    await arbiter.connect(dao).configureFlashGovernance(
      await token.getAddress(),
      amount,
      unlockTime,
      false
    );

    // Configure security parameters with epoch size of 0 to bypass epoch check
    await arbiter.connect(dao).configureSecurityParameters(50, 0, 50);

    // Mint tokens to sender and approve arbiter to spend them
    await token.mint(await sender.getAddress(), amount);
    await token.connect(sender).approve(await arbiter.getAddress(), amount);

    // Execute governance decision - should succeed in original, fail in mutant
    await expect(
      arbiter.connect(sender).assertGovernanceApproved(
        await sender.getAddress(),
        await target.getAddress(),
        true // emergency mode bypasses epoch check
      )
    ).to.not.be.reverted;

    // Verify the event was emitted (additional assertion)
    await expect(
      arbiter.connect(sender).assertGovernanceApproved(
        await sender.getAddress(),
        await target.getAddress(),
        true
      )
    ).to.emit(arbiter, "flashDecision");
  });
});