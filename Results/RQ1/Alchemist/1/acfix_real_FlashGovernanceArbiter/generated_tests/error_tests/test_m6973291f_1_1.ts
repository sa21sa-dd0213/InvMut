import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - withdrawGovernanceAsset require removed", function () {
  it("should revert when calling withdrawGovernanceAsset with no pending decision", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock DAO that returns a flash governor address
    const MockDAODao = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAODao.deploy();
    await mockDAO.waitForDeployment();

    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    // Try to withdraw governance asset when no pending decision exists
    // This should revert in the original contract but succeed in the mutant
    await expect(
      instance.connect(addr1).withdrawGovernanceAsset(
        await mockDAO.getAddress(), // targetContract
        await mockToken.getAddress() // asset
      )
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
  });
});