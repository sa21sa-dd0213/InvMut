import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should execute transfers for multiple recipients - kills mutant m4b20d086", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token contract to verify transferFrom calls
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Setup: mint tokens to owner and approve airPort contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(await instance.getAddress(), mintAmount);

    // Prepare recipients array with multiple addresses
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Get initial balances
    const initialBalance1 = await token.balanceOf(addr1.address);
    const initialBalance2 = await token.balanceOf(addr2.address);

    // Execute the transfer function
    await instance.transfer(owner.address, await token.getAddress(), recipients, transferAmount);

    // Verify both recipients received tokens (this assertion will fail on mutant)
    expect(await token.balanceOf(addr1.address)).to.equal(initialBalance1 + transferAmount);
    expect(await token.balanceOf(addr2.address)).to.equal(initialBalance2 + transferAmount);
  });
});