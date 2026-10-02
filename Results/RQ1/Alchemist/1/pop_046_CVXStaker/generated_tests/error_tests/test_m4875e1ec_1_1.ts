import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant test for setRewardsRecipient", function () {
  it("should set rewardsRecipient to the provided address, not address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardTokens = [addr1.address];

    const Factory = await ethers.getContractFactory("CVXStaker");
    const instance = await Factory.deploy(
      owner.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();

    // Set a non-zero rewards recipient
    const recipient = addr2.address;
    await instance.connect(owner).setRewardsRecipient(recipient);

    // Verify the rewardsRecipient was set correctly (not address(0))
    const storedRecipient = await instance.rewardsRecipient();
    expect(storedRecipient).to.equal(recipient);
  });
});