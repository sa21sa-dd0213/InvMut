import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m6bb5652f by sending Ether to the contract via receive function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial depositsCount
    const initialDepositsCount = await instance.depositsCount();
    expect(initialDepositsCount).to.equal(0);

    // Send Ether to the contract via receive function - should succeed in original
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Verify depositsCount incremented (original behavior)
    const finalDepositsCount = await instance.depositsCount();
    expect(finalDepositsCount).to.equal(1);

    // Send another Ether to confirm continued functionality
    const tx2 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.5")
    });
    await tx2.wait();

    const finalDepositsCount2 = await instance.depositsCount();
    expect(finalDepositsCount2).to.equal(2);
  });
});