import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - burn with less than full balance", function () {
  it("should revert when burning less than full balance on mutant (== check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const name = "TestToken";
    const symbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // Transfer some tokens to addr1 so they have a partial balance
    const transferAmount = 500;
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // addr1 tries to burn only 100 tokens (less than their full balance of 500)
    // On original: succeeds with >= check
    // On mutant: reverts with == check because 100 != 500
    await expect(
      instance.connect(addr1).burn(100)
    ).to.be.reverted;
  });
});