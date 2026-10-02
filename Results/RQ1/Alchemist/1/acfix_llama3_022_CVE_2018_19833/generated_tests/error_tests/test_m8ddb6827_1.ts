import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ERCDDAToken - Kill mutant m8ddb6827", function () {
  it("should revert when transferring an amount less than sender's balance due to mutated <= check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const name = "TestToken";
    const symbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, name, symbol);
    await instance.waitForDeployment();

    // Owner has all tokens (1000 * 10^0 = 1000)
    // Attempt to transfer 100 tokens (less than owner's full balance)
    // Original: require(balanceOf[owner] >= 100) -> true (pass)
    // Mutant:   require(balanceOf[owner] <= 100) -> false (revert)
    await expect(
      instance.transfer(addr1.address, 100)
    ).to.be.reverted;
  });
});