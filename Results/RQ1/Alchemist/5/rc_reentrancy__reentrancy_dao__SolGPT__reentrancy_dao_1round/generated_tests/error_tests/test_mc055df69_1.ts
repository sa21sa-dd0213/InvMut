import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mc055df69", function () {
  it("should detect that deposit credits one wei less than msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // addr1 deposits exactly 1 ether
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Now withdrawAll - this should send back the credited amount (which is depositAmount - 1 wei in the mutant)
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    const withdrawTx = await instance.connect(addr1).withdrawAll();
    const receipt = await withdrawTx.wait();
    
    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    
    // Final balance should be: initialBalance + creditedAmount - gasCost
    // In original: creditedAmount = depositAmount, so final = initialBalance + depositAmount - gasCost
    // In mutant: creditedAmount = depositAmount - 1, so final = initialBalance + depositAmount - 1 - gasCost
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    
    // Expected balance for original (deposit then full withdrawal):
    // initialBalance + depositAmount - gasCost
    const expectedOriginal = initialBalance + depositAmount - gasCost;
    
    // For the mutant, the user would have 1 wei less than expected
    expect(finalBalance).to.equal(expectedOriginal - 1n);
  });
});