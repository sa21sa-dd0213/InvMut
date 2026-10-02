import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Kill mutant m84b73a6a", function () {
  it("should successfully receive Ether and increment depositsCount (mutant changes >= to == making it always revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const initialDepositsCount = await instance.depositsCount();
    expect(initialDepositsCount).to.equal(0);
    
    // Send 1 ether to the contract via receive() function
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // If mutant is killed, depositsCount should be incremented
    const finalDepositsCount = await instance.depositsCount();
    expect(finalDepositsCount).to.equal(1);
  });
});