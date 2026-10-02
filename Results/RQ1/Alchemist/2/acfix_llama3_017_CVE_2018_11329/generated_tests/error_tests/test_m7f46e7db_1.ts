import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant m7f46e7db", function () {
  it("should kill mutant by verifying buyDrugs calculates correct drug amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first (required before any trading)
    await instance.seedMarket(1000);

    // Get initial balance of contract
    const initialBalance = await ethers.provider.getBalance(instance.target);
    
    // Calculate expected drugs using the original formula
    const ethAmount = ethers.parseEther("1.0");
    const expectedContractBalance = initialBalance + ethAmount;
    
    // Call buyDrugs with 1 ETH
    const tx = await instance.connect(addr1).buyDrugs({ value: ethAmount });
    await tx.wait();

    // Get the actual drugs claimed by addr1
    const actualDrugs = await instance.getMyDrugs();

    // Calculate what the correct amount should be using the original formula
    // The mutant uses msg.value+1 in the sub, which changes the contractBalance parameter
    // Original: calculateDrugBuy(msg.value, address(this).balance - msg.value)
    // Mutant:   calculateDrugBuy(msg.value, address(this).balance - (msg.value + 1))
    
    // Get the contract balance after the transaction
    const finalBalance = await ethers.provider.getBalance(instance.target);
    
    // The expected drugs should be calculated with the correct formula
    // We can verify by calling the view function directly
    const expectedDrugs = await instance.calculateDrugBuy(ethAmount, initialBalance);
    
    // The mutant would give a different result because it subtracts msg.value+1 instead of msg.value
    // from the contract balance, making the contract appear to have less ETH
    expect(actualDrugs).to.equal(expectedDrugs);
  });
});