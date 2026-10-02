import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert transfer to zero address in original but allow transfer to valid address; mutant reverses this logic", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt a normal transfer to a non-zero address (addr1)
    // In the original contract this should succeed
    // In the mutant this will revert because require(_to == address(0)) fails for non-zero address
    await expect(
      instance.connect(owner).transfer(addr1.address, 100)
    ).to.not.be.reverted;
  });
});