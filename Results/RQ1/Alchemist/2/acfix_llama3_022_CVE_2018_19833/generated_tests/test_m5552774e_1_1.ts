import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - onlyOwner modifier", function () {
  it("should revert when owner calls onlyOwner function after modifier change from == to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments: initialSupply, name, symbol
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TTK";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // So when the owner calls an onlyOwner function, it should revert (since owner != owner is false)
    await expect(
      instance.connect(owner).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});