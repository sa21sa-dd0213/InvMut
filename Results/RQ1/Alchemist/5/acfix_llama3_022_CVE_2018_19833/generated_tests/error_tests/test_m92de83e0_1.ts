import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should prevent non-owner from freezing accounts (kill mutant m92de83e0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TST";
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling freezeAccount should revert in the original contract
    // The mutant removes the onlyOwner modifier, so the call would succeed instead of reverting
    await expect(
      instance.connect(addr1).freezeAccount(addr2.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});