import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect balance inflation in deposit function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of contract
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Deposit 1 ether
    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Check that credit[addr1] equals the deposit amount (should be correct)
    const credit = await instance.credit(addr1.address);
    expect(credit).to.equal(depositAmount);

    // Check that the internal balance variable is inflated by 1 wei (msg.value + 1)
    const contractBalance = await instance.balance();
    const expectedCorrectBalance = initialBalance + depositAmount;
    expect(contractBalance).to.equal(expectedCorrectBalance + BigInt(1));

    // Withdraw all credit for addr1
    const withdrawTx = await instance.connect(addr1).withdrawAll();
    await withdrawTx.wait();

    // After withdrawal, credit should be 0
    const creditAfterWithdraw = await instance.credit(addr1.address);
    expect(creditAfterWithdraw).to.equal(0);

    // The internal balance variable should still have the extra 1 wei (not actually sent)
    const finalBalance = await instance.balance();
    expect(finalBalance).to.equal(BigInt(1));

    // The actual Ether balance of the contract should be 0 (since all was withdrawn)
    const actualContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(actualContractBalance).to.equal(0);
  });
});