import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - md21f04e1", function () {
  it("should revert when transferring amount exceeding sender balance, killing mutant that removed balance check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has all tokens initially (1000 * 10^0 = 1000)
    // addr1 has 0 tokens
    // Attempt to transfer 1 token from addr1 to owner - should fail due to insufficient balance
    await expect(
      instance.connect(addr1).transfer(owner.address, 1)
    ).to.be.reverted;
  });
});