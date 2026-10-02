import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - m0f4ea6e3", function () {
  it("should kill mutant by sending ether to receive() and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialDepositsCount = await instance.depositsCount();
    
    // Send 1 ETH to the contract, triggering receive()
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    const finalDepositsCount = await instance.depositsCount();
    
    // On the original contract, depositsCount increments by 1
    // On the mutant, the require fails and the transaction reverts
    // If the mutant is alive, the test will fail here because depositsCount didn't change
    expect(finalDepositsCount).to.equal(initialDepositsCount + 1n);
  });
});