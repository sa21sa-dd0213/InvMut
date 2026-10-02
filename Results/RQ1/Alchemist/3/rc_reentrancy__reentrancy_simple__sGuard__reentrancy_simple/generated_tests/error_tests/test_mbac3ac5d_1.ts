import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbac3ac5d test", function () {
  it("should kill the mutant by detecting incorrect balance credit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // addr1 deposits exactly 1 wei
    const depositAmount = 1n;
    await instance.connect(addr1).addToBalance({ value: depositAmount });

    // On the mutant, addr1's balance will be credited as depositAmount + 1 = 2 wei
    // On the original, addr1's balance will be exactly 1 wei
    const userBalance = await instance.getBalance(addr1.address);

    // Withdraw the full balance
    await instance.connect(addr1).withdrawBalance();

    // Check contract final balance - on mutant it will be negative (revert) or incorrect
    // because it tried to send 2 wei but only 1 wei was actually sent
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // The original would have: initialBalance + 1 - 1 = initialBalance
    // The mutant would try: initialBalance + 1 - 2 = initialBalance - 1 (impossible if contract had no ether)
    expect(finalBalance).to.equal(initialBalance);
  });
});