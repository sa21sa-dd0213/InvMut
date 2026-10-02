import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - mcdd017f6", function () {
  it("should detect mutant that changes loop condition from i < _tos.length to i > _tos.length", async function () {
    const [owner, from, recipient] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing transferFrom
    const ERC20Factory = await ethers.getContractFactory("TestERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy the airDrop contract (no constructor arguments needed)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Mint tokens to 'from' address and approve airDrop to spend them
    const mintAmount = ethers.parseUnits("1000", 18);
    await token.mint(from.address, mintAmount);

    // Approve the airDrop contract to transfer tokens on behalf of 'from'
    await token.connect(from).approve(await airDrop.getAddress(), mintAmount);

    // Record balance before transfer
    const balanceBefore = await token.balanceOf(recipient.address);

    // Prepare transfer parameters: v = 100 tokens with 18 decimals
    const v = 100;
    const decimals = 18;
    const recipients = [recipient.address];

    // Execute the transfer function
    const tx = await airDrop.transfer(from.address, await token.getAddress(), recipients, v, decimals);
    await tx.wait();

    // Check recipient balance - should have increased by 100 tokens in original
    const balanceAfter = await token.balanceOf(recipient.address);
    const expectedIncrease = ethers.parseUnits("100", 18);

    // If mutant is present (i > _tos.length), loop never executes, balance stays the same
    // If original (i < _tos.length), loop executes and balance increases
    expect(balanceAfter - balanceBefore).to.equal(expectedIncrease);
  });
});