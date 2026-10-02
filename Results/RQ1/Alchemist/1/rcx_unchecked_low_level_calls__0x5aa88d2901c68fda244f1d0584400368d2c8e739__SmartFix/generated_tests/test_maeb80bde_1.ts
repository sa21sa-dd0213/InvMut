import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant maeb80bde", function () {
  it("should kill mutant by sending non-zero ether to multiplicate when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether first (using receive function)
    const fundingAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundingAmount
    });
    
    // Verify contract has balance
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundingAmount);
    
    // Now call multiplicate with a non-zero msg.value (e.g., 0.5 ether)
    const attackAmount = ethers.parseEther("0.5");
    
    // The original contract would succeed, but the mutant's require will fail
    // because (balance - msg.value) >= balance is false for any positive msg.value
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: attackAmount })
    ).to.be.reverted;
    
    // Additional assertion: contract balance should remain unchanged
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundingAmount);
  });
});