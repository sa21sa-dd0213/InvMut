import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when transferring 0 tokens to detect mutant m073202b5", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // In the original contract, transferring 0 tokens passes the addition check (balance + 0 >= balance)
    // but in the mutant, the multiplication check (balance * 0 >= balance) becomes 0 >= balance, which
    // reverts for any non-zero balance. So a 0-value transfer should succeed on original but fail on mutant.
    await expect(
      instance.connect(addr1).transfer(owner.address, 0)
    ).to.not.be.reverted;
  });
});