import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m2a879f35", function () {
  it("should detect the mutant by sending exactly 10 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the contract via fallback
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Wait for the transaction to be mined
    await tx.wait();

    // If the mutant is present (require(msg.value != 10 ether)), 
    // the transaction with exactly 10 ether would revert.
    // If the transaction succeeded, the original code is present.
    // Since we expect success on original but the mutant would revert,
    // we check that the transaction actually succeeded (no revert)
    // by verifying the receipt status
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    expect(receipt?.status).to.equal(1);
  });
});