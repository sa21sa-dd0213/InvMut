import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m601a30a2 test", function () {
  it("should detect that winnersPot() returns 0 instead of half the balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const betLimit = ethers.parseEther("1.0");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, betLimit);
    await instance.waitForDeployment();
    
    // Owner opens the contract to public
    await instance.connect(owner).OpenToThePublic();
    
    // addr1 makes a wager, sending 1 ETH to the contract
    const wagerTx = await instance.connect(addr1).wager({ value: betLimit });
    await wagerTx.wait();
    
    // Get contract balance after wager
    const balance = await ethers.provider.getBalance(instance.target);
    const expectedWinnersPot = balance / 2n;
    
    // Call winnersPot() - mutant returns 0 instead of half balance
    const actualWinnersPot = await instance.winnersPot();
    
    // Assert that the returned value is NOT zero (which would indicate the mutant)
    expect(actualWinnersPot).to.not.equal(0n);
    
    // Assert that the returned value equals half the contract balance
    expect(actualWinnersPot).to.equal(expectedWinnersPot);
  });
});