import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - _transfer address(0) check", function () {
  it("should allow transfer to non-zero address and detect mutant that requires _to == address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Transfer to a non-zero address should succeed in original contract
    // In mutant, require(_to == address(0)) will cause revert
    const transferValue = 100;
    const tx = instance.connect(owner).transfer(addr1.address, transferValue);
    
    // The original contract allows this transfer, but the mutant reverts
    // If the transfer succeeds, the mutant is NOT detected (test passes)
    // If it reverts, the mutant IS detected (test fails - which is what we want to detect)
    await expect(tx).to.not.be.reverted;
  });
});