import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - recoverToken event emission test", function () {
  it("should emit RecoveredToken event when recoverToken is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", 18);
    await mockToken.waitForDeployment();

    // Mint tokens to the CVXStaker contract for recovery
    const mintAmount = ethers.parseEther("100");
    await mockToken.mint(owner.address, mintAmount);

    // Deploy CVXStaker with required constructor arguments
    // We need a CLP token, booster, operator address, and reward tokens array
    const MockCLP = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockCLP.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const operator = addr1.address;
    const rewardTokens: string[] = [];

    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const instance = await CVXStaker.deploy(
      operator,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();

    // Transfer some mock tokens to the CVXStaker contract for recovery testing
    await mockToken.transfer(await instance.getAddress(), mintAmount);

    // Test: call recoverToken as owner and expect event emission
    const toAddress = owner.address;
    const recoverAmount = ethers.parseEther("50");

    await expect(
      instance.connect(owner).recoverToken(
        await mockToken.getAddress(),
        toAddress,
        recoverAmount
      )
    )
      .to.emit(instance, "RecoveredToken")
      .withArgs(await mockToken.getAddress(), toAddress, recoverAmount);
  });
});