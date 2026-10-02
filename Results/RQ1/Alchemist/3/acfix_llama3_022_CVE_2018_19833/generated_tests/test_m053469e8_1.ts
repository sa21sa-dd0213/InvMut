import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - m053469e8", function () {
  it("should detect the mutant by transferring a positive amount to an address with existing balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const name = "TestToken";
    const symbol = "TT";
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // First transfer some tokens to addr1 so it has a non-zero balance
    const transferAmount1 = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount1);

    // Now transfer a positive amount to addr1 again - this should work in the original
    // but revert in the mutant due to the <= overflow check
    const transferAmount2 = ethers.parseEther("50");
    
    // In the original, this should succeed; in the mutant it should revert
    // We expect it to revert to detect the mutant
    await expect(
      instance.transfer(addr1.address, transferAmount2)
    ).to.be.reverted;
  });
});