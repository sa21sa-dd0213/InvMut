import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358 test", function () {
  it("should revert when external transferFrom call fails (mutant missing require)", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20 token that will revert on transferFrom
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy the airdrop contract (no constructor arguments needed)
    const Airdrop = await ethers.getContractFactory("airdrop");
    const airdrop = await Airdrop.deploy();
    await airdrop.waitForDeployment();

    // Prepare test data: from address has no tokens, so transferFrom will fail
    const recipients = [to.address];
    const amount = ethers.parseEther("10");

    // Attempt to call transfer - should revert on original, but mutant might not
    await expect(
      airdrop.transfer(from.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});