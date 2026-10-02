import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - mutant m574ddeba", function () {
  it("should kill mutant by triggering OR logic when transferFrom fails", async function () {
    const [owner, user, target] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory(
      "contracts/mocks/MockERC20.sol:MockERC20"
    );
    const mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();

    // Deploy a mock DAO that returns the flash governor address
    const MockDAOfactory = await ethers.getContractFactory(
      "contracts/mocks/MockLimboDAO.sol:MockLimboDAO"
    );
    const mockDAO = await MockDAOfactory.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Configure the DAO to return our instance as flash governor
    await mockDAO.setFlashGoverner(await instance.getAddress());

    // Set up the flash governance config via a successful proposal
    const unlockTime = 3600; // 1 hour
    const amount = ethers.parseEther("100");
    await instance.configureFlashGovernance(
      await mockToken.getAddress(),
      amount,
      unlockTime,
      false
    );

    // Configure security parameters
    await instance.configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize (1 day)
      50 // changeTolerance
    );

    // Set the user as governed to pass the flashEnabled modifier
    await instance.setGoverned([await user.getAddress()], [true]);

    // Set the DAO to make successfulProposal return true for owner (for configuration)
    await mockDAO.setSuccessfulProposal(await owner.getAddress(), true);

    // Now set configured to true to enable enforcement
    await instance.endConfiguration();

    // Ensure user has no tokens (transferFrom will fail)
    const userBalance = await mockToken.balanceOf(await user.getAddress());
    expect(userBalance).to.equal(0);

    // Set enforceLimitsActive for user
    await instance.setEnforcement(false);

    // The key: transferFrom will return false (user has no tokens and no approval)
    // On original (&&): both conditions must be true -> revert
    // On mutant (||): only one condition needs to be true -> if unlockTime condition is met, it proceeds

    // Since pendingFlashDecision[target][user].unlockTime is 0 (default) < block.timestamp,
    // the second condition is true. With ||, the function proceeds even though transferFrom fails.

    await expect(
      instance.connect(user).assertGovernanceApproved(
        await user.getAddress(),
        await target.getAddress(),
        false // emergency = false
      )
    ).to.not.be.reverted; // Mutant allows this, original would revert
  });
});