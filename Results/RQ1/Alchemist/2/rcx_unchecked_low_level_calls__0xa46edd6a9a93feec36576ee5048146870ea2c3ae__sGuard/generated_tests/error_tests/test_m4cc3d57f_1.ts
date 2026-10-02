import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m4cc3d57f", function () {
  it("should detect mutant that changes loop condition from < to >", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed as per contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: create a mock token to test transferFrom - we need an ERC20 token address
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("contracts/test/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Mint tokens to 'from' address and approve the EBU contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);

    // Prepare recipients and values
    const recipients = [recipient1.address, recipient2.address];
    const values = [ethers.parseEther("10"), ethers.parseEther("20")];

    // Record balances before
    const balance1Before = await token.balanceOf(recipient1.address);
    const balance2Before = await token.balanceOf(recipient2.address);

    // Call the transfer function
    const tx = await instance.connect(owner).transfer(from.address, tokenAddress, recipients, values);
    await tx.wait();

    // Check balances after - original would transfer, mutant would not
    const balance1After = await token.balanceOf(recipient1.address);
    const balance2After = await token.balanceOf(recipient2.address);

    // For original: balance1After = balance1Before + 10, balance2After = balance2Before + 20
    // For mutant (loop never executes): balances remain unchanged
    expect(balance1After).to.equal(balance1Before + values[0]);
    expect(balance2After).to.equal(balance2Before + values[1]);
  });
});