import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea - balance inflation", function () {
  it("should detect mutant by verifying balance tracks actual deposited amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit exactly 1 ETH from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw all from addr1
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // After withdrawal, the contract should have zero balance
    // On the original, this passes because internal balance matches actual ether.
    // On the mutant, internal balance was inflated by 1 wei, so either:
    // - withdrawAll reverts due to underflow (balance -= oCredit where oCredit < balance)
    // - or the call succeeds but internal balance remains non-zero
    // We check the contract's ether balance to detect the inflation
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});