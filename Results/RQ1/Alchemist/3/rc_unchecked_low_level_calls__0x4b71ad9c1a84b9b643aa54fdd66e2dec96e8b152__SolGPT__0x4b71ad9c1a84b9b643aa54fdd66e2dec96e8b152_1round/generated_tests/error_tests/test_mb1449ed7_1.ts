import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection test", function () {
  it("should revert when transferring to an empty _tos array due to out-of-bounds access in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create an empty recipients array - original uses < so loop never runs
    // Mutant uses <= so i=0 <= 0 is true, attempts to access _tos[0] which is out of bounds
    const emptyAddresses: string[] = [];
    
    // Use a valid token address (any contract address works for the call)
    const tokenAddress = addr2.address;
    
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});