import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - multiplication vs addition", function () {
  it("should detect mutant that replaces * with + in _value calculation", async function () {
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner, addr1, addr2] = await ethers.getSigners();

    // Setup: create a mock token that implements transferFrom
    // Deploy a simple ERC20-like contract to use as caddress
    const TokenFactory = await ethers.getContractFactory("contracts/SimpleERC20.sol:SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to owner and approve the airDrop contract to transfer
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Prepare test parameters
    const from = owner.address;
    const caddress = await token.getAddress();
    const recipients = [addr1.address, addr2.address];
    const v = 5; // multiply factor
    const decimals = 2; // 10**2 = 100

    // Original: _value = 5 * 100 = 500
    // Mutant:   _value = 5 + 100 = 105

    // Get balance before
    const balanceBefore1 = await token.balanceOf(addr1.address);
    const balanceBefore2 = await token.balanceOf(addr2.address);

    // Execute transfer
    const tx = await instance.transfer(from, caddress, recipients, v, decimals);
    await tx.wait();

    // Check balances after - original would transfer 500 each, mutant would transfer 105 each
    const balanceAfter1 = await token.balanceOf(addr1.address);
    const balanceAfter2 = await token.balanceOf(addr2.address);

    // Original expected: 500 tokens each
    // Mutant expected: 105 tokens each
    // This assertion will pass on original (500) but fail on mutant (105)
    expect(balanceAfter1 - balanceBefore1).to.equal(ethers.parseEther("500"));
    expect(balanceAfter2 - balanceBefore2).to.equal(ethers.parseEther("500"));
  });
});