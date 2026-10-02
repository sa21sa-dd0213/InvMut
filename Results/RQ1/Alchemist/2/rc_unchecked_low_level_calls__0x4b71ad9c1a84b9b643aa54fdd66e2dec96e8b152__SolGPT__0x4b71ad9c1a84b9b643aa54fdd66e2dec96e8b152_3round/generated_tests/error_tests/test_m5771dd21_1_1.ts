import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m5771dd21 by verifying transferFrom selector correctness", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();

    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address and approve airPort contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    const approveAmount = ethers.parseEther("50");
    await token.connect(from).approve(await instance.getAddress(), approveAmount);

    // Prepare test parameters
    const recipients = [to1.address, to2.address];
    const transferAmount = ethers.parseEther("10");

    // Call transfer on airPort - should succeed on original, fail on mutant
    const tx = instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );

    // On the mutant, sha256 produces wrong selector -> call fails -> require reverts
    await expect(tx).to.be.reverted;

    // If it doesn't revert (original), verify tokens were actually transferred
    // This assertion will fail on the mutant, killing it
    const balance1 = await token.balanceOf(to1.address);
    const balance2 = await token.balanceOf(to2.address);
    expect(balance1).to.equal(transferAmount);
    expect(balance2).to.equal(transferAmount);
  });
});