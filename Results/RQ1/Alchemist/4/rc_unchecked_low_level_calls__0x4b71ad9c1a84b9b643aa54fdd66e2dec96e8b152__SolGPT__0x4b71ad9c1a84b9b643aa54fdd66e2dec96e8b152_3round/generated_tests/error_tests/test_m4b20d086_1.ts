import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m4b20d086 test", function () {
  it("should kill mutant by verifying transfer call executes for non-empty _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to use as the token target
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Setup: owner transfers tokens to the airPort contract so it can transferFrom
    await token.transfer(await instance.getAddress(), ethers.parseEther("100"));

    // Setup: approve airPort contract to spend tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with non-empty _tos array - should succeed in original, fail in mutant
    const recipients = [await addr1.getAddress()];
    const amount = ethers.parseEther("10");

    // In original: loop runs and call succeeds; in mutant: loop never runs (i>length false)
    await expect(
      instance.transfer(
        await owner.getAddress(),
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.not.be.reverted;

    // Verify the transfer actually happened (should be reverted in mutant since loop never executes)
    const balanceAfter = await token.balanceOf(await addr1.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("10"));
  });
});