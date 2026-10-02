import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mf6ff530c by verifying winnersPot returns half of contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Open to public
    await instance.connect(owner).OpenToThePublic();
    
    // Send some ETH to the contract to create a balance
    const depositAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    
    // Get contract balance
    const contractBalance = await instance.ethBalance();
    
    // Call winnersPot - should return half the balance
    const potAmount = await instance.winnersPot();
    
    // Original: returns balance / 2
    // Mutant: returns balance - 2
    // With 10 ETH balance: original returns 5 ETH, mutant returns (10 ETH - 2 wei)
    expect(potAmount).to.equal(contractBalance / 2n);
  });
});