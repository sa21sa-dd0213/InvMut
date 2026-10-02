import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mc3003844 by verifying successful sendMoney transaction does not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for the test
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Send ether to addr1 using sendMoney - should succeed in original, revert in mutant
    const sendAmount = ethers.parseEther("0.5");
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    const tx = await instance.connect(owner).sendMoney(addr1.address, sendAmount);
    await tx.wait();

    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // Assert that the transfer succeeded (mutant would revert here)
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(sendAmount);
  });
});