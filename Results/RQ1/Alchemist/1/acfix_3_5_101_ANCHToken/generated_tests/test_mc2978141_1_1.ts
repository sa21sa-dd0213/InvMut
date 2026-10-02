import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mc2978141 test", function () {
  it("should kill the mutant by verifying totalFees returns > 0 after a fee-generating transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock Uniswap router address and mock USD token address
    // Using zero addresses for simplicity as we only need to test totalFees
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      "0x0000000000000000000000000000000000000001", // mock router
      "0x0000000000000000000000000000000000000002"  // mock USD token
    );
    await instance.waitForDeployment();

    // Set minTxnAmount to a small value so transfers can trigger rewards
    await instance.setMinTxnAmount(ethers.parseEther("1"));
    
    // Transfer some tokens to addr1 to enable fee generation
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);
    
    // Call totalFees - original would return accumulated fees (non-zero),
    // mutant returns 0 because the return statement is removed
    const totalFees = await instance.totalFees();
    
    // If totalFees is 0, the mutant is killed (original would be > 0)
    expect(totalFees).to.be.gt(0);
  });
});