import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test - m5ec685be", function () {
  it("should detect mutant by sending balance - 1 wei and expecting no transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for MultiplicatorX4)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 2 ether from owner
    const fundAmount = ethers.parseEther("2");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly balance - 1 wei as msg.value to multiplicate
    const sendAmount = initialBalance - BigInt(1);
    
    // Call multiplicate with addr1 as recipient
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: sendAmount })
    ).to.not.be.reverted;
    
    // Verify contract balance remains unchanged (mutant would have transferred)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});