import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should prevent non-owner from freezing accounts (mutant kills onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Attempt to freeze an account from a non-owner address - should revert in original
    await expect(
      instance.connect(addr1).freezeAccount(addr2.address, true)
    ).to.be.reverted;
  });
});