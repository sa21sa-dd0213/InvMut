import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect the msg.value-1 mutant by verifying deposited amount equals withdrawn amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw all
    await instance.connect(addr1).withdrawAll();

    // Check that addr1's balance increased by exactly 1 ether (not 1 ether - 1 wei)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const expectedBalance = ethers.parseEther("10000.0"); // initial balance minus gas, but we check relative change
    // More precise: check that the difference is exactly the deposit amount
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    // Actually let's redo: track balance before deposit
    const balanceBeforeDeposit = await ethers.provider.getBalance(addr1.address);
    const txDeposit = await instance.connect(addr1).deposit({ value: depositAmount });
    await txDeposit.wait();
    const balanceAfterDeposit = await ethers.provider.getBalance(addr1.address);
    const txWithdraw = await instance.connect(addr1).withdrawAll();
    await txWithdraw.wait();
    const balanceAfterWithdraw = await ethers.provider.getBalance(addr1.address);

    // Net change after deposit + withdraw should be zero (minus gas)
    // But mutant credits msg.value-1, so user loses 1 wei permanently
    // With original contract, user gets back exactly what they deposited
    // With mutant, user gets back msg.value-1, so net loss of 1 wei
    // We can check that balanceAfterWithdraw is less than balanceBeforeDeposit by more than gas costs
    // A simpler approach: check that contract balance is 0 after withdraw in original, but in mutant it's 1 wei
    const contractBalance = await ethers.provider.getBalance(instance.target);
    // In original, contract balance should be 0; in mutant, it's 1 wei
    expect(contractBalance).to.equal(ethers.parseEther("0.0"));
  });
});