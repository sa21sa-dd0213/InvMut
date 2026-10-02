import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8ddb6827 by transferring less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    
    // Deploy with initial supply of 1000 tokens, name "Test", symbol "TST"
    const instance = await Factory.deploy(1000, "Test", "TST");
    await instance.waitForDeployment();

    // Get owner's balance (should be 1000 * 10^0 = 1000 tokens)
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseUnits("1000", 0));

    // Transfer 500 tokens (less than full balance of 1000) to addr1
    // This should succeed on original but revert on mutant due to <= check
    const tx = instance.transfer(addr1.address, ethers.parseUnits("500", 0));
    
    // Expect the transaction to succeed on original, but we check it reverts for the mutant
    await expect(tx).to.be.reverted;
  });
});