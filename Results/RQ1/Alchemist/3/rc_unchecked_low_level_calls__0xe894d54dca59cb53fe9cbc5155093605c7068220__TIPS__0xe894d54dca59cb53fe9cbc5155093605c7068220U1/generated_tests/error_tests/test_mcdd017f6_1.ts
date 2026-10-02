import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - mcdd017f6", function () {
  it("should detect mutant by verifying loop executes for non-empty _tos array", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy the airDrop contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the target contract
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to the 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Set up parameters: transfer 10 tokens with 18 decimals
    const value = ethers.parseEther("10");
    const recipients = [recipient.address];
    const decimals = 18;

    // Call transfer on the airDrop contract
    const tx = await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      value,
      decimals
    );
    await tx.wait();

    // Verify that the recipient actually received tokens
    // If the mutant is present (loop never executes), no transfer happens
    const recipientBalance = await token.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(ethers.parseEther("10"));
  });
});