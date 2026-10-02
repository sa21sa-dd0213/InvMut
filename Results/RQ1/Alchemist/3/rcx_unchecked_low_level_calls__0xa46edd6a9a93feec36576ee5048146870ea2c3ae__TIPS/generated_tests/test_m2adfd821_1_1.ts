import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - loop condition change", function () {
  it("should detect mutant where i < _tos.length is changed to i > _tos.length", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();

    // Deploy EBU contract (no constructor arguments needed)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();

    // Deploy a simple ERC20 token to test transferFrom
    // We'll use a minimal ERC20 for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Setup: mint tokens to 'from' address and approve EBU contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await ebu.getAddress(), mintAmount);

    // Prepare test parameters
    const recipients = [recipient1.address, recipient2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // Get initial balances
    const initialBalanceFrom = await token.balanceOf(from.address);
    const initialBalanceRecipient1 = await token.balanceOf(recipient1.address);
    const initialBalanceRecipient2 = await token.balanceOf(recipient2.address);

    // Call transfer function
    const tx = await ebu.transfer(from.address, await token.getAddress(), recipients, amounts);
    await tx.wait();

    // Check balances after transfer
    const finalBalanceFrom = await token.balanceOf(from.address);
    const finalBalanceRecipient1 = await token.balanceOf(recipient1.address);
    const finalBalanceRecipient2 = await token.balanceOf(recipient2.address);

    // On original: transfers should occur
    // On mutant: loop never executes (i > _tos.length is false initially), so no transfers happen
    expect(finalBalanceFrom).to.equal(initialBalanceFrom - amounts[0] - amounts[1]);
    expect(finalBalanceRecipient1).to.equal(initialBalanceRecipient1 + amounts[0]);
    expect(finalBalanceRecipient2).to.equal(initialBalanceRecipient2 + amounts[1]);
  });
});