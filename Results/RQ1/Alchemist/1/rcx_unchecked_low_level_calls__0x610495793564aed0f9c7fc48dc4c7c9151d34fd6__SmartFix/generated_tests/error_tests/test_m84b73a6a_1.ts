import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should accept ether deposit and increment depositsCount (kills mutant that changes >= to == in receive)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ether to trigger receive() function
    const depositAmount = ethers.parseEther("1.0");
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    await tx.wait();

    // Verify the deposit was accepted - depositsCount should be 1
    const depositsCount = await instance.depositsCount();
    expect(depositsCount).to.equal(1);

    // Verify the contract balance increased
    const balance = await ethers.provider.getBalance(await instance.getAddress());
    expect(balance).to.equal(depositAmount);
  });
});