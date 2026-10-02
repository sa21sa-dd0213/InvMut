import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - constructor name/symbol", function () {
  it("should detect mutant that removes ERC20 constructor arguments by checking name() and symbol()", async function () {
    const [owner] = await ethers.getSigners();
    const liquidityReceiveAddress = owner.address;
    
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // The original contract should return "DCF Token" for name() and "DCF" for symbol()
    // The mutant will return empty strings because it doesn't pass the arguments to ERC20
    expect(await instance.name()).to.equal("DCF Token");
    expect(await instance.symbol()).to.equal("DCF");
  });
});