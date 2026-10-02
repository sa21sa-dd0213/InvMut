import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m5fe82436 by detecting incorrect value calculation from exponentiation vs multiplication", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    // The contract has no constructor arguments
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the caddress
    // Since airDrop expects an ERC20 transferFrom, we create a minimal token
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    // Assume an ERC20Mock contract exists in the project with constructor(name, symbol, decimals, initialSupply)
    // If not, we can use a simple approach with a token that has transferFrom
    const token = await TokenFactory.deploy("Test", "TST", 18, ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give owner some tokens and approve the airDrop contract to spend from owner
    await token.transfer(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Setup parameters: v = 2, _decimals = 1
    // Original: _value = 2 * 10**1 = 20
    // Mutant: _value = 2 ** 10**1 = 2**10 = 1024
    const v = 2;
    const _decimals = 1;
    const recipients = [addr1.address];

    // Get balances before
    const balanceBefore = await token.balanceOf(addr1.address);

    // Execute transfer
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      v,
      _decimals
    );
    await tx.wait();

    // Get balance after
    const balanceAfter = await token.balanceOf(addr1.address);

    // Expected transferred amount from original: 20 tokens (since decimals=1 means 10^1)
    const expectedAmount = v * (10 ** _decimals); // 20
    const actualTransferred = Number(balanceAfter) - Number(balanceBefore);

    // The mutant would transfer 1024 tokens instead of 20, so this assertion fails on mutant
    expect(actualTransferred).to.equal(expectedAmount);
  });
});