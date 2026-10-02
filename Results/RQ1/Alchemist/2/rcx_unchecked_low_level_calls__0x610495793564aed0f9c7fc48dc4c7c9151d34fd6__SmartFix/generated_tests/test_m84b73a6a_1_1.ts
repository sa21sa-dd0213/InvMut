import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m84b73a6a", function () {
  it("should kill mutant by sending ether when depositsCount is 0 and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially depositsCount should be 0
    expect(await instance.depositsCount()).to.equal(0);

    // Send ether to the contract via receive function
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // If contract is original, depositsCount increments to 1
    // If mutant, the require will revert because 0+1 != 0
    expect(await instance.depositsCount()).to.equal(1);
  });
});