import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow receiving ether and increment depositsCount - kills mutant that changes + to - in receive()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial depositsCount should be 0
    expect(await instance.depositsCount()).to.equal(0);

    // Send ether to the contract via receive() - original allows it, mutant reverts
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // After successful receive(), depositsCount should be 1
    expect(await instance.depositsCount()).to.equal(1);
  });
});